import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { format, parseISO } from 'date-fns';
import en from 'date-fns/locale/en-US';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { showMessage } from 'react-native-flash-message';

import api from '~/services/api';

import Background from '~/components/Background';
import Header from '~/components/Header';
import DatePicker from '~/components/DatePicker';
import EmptyContainer from '~/components/EmptyContainer';
import Meetup from '~/components/MeetupCard';

import { Container, LoadingIndicator, MeetupList } from './styles';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefrehing] = useState(false);
  const [page, setPage] = useState(1);
  const [endOfList, setEndOfList] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [meetups, setMeetups] = useState([]);
  const [searchDate, setSearchDate] = useState(new Date());

  const user = useSelector(state => state.user.user);

  useEffect(() => {
    async function loadMeetups() {
      if (!endOfList || !refreshing) {
        const response = await api.get('meetups', {
          params: {
            date: searchDate,
            page: page === 0 ? 1 : page,
          },
        });

        const data = response.data.map(meetup => ({
          ...meetup,
          subscribed: !!meetup.Subscriptions.find(
            subscription => subscription.user_id === user.id
          ),
          formattedDate: format(
            parseISO(meetup.date),
            "dd 'of' MMMM, yyyy '-' HH'h'mm",
            {
              locale: en,
            }
          ),
        }));

        if (data.length === 0) {
          setEndOfList(true);
        }

        setMeetups([...meetups, ...data]);
      }

      setLoading(false);
      setRefrehing(false);
      setFetching(false);
    }

    loadMeetups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchDate, user.id]);

  function refresh() {
    setRefrehing(true);
    setEndOfList(false);
    setMeetups([]);

    if (page === 0) {
      setPage(1);
    } else {
      setPage(0);
    }
  }

  function loadMore() {
    if (!endOfList && !fetching && meetups.length >= 5) {
      setFetching(true);

      if (page === 0) {
        setPage(2);
      } else {
        setPage(page + 1);
      }
    }
  }

  async function handleSubscribe(id) {
    try {
      await api.post(`meetups/${id}/subscriptions`);

      showMessage({
        message: 'Subscribed to meeting!',
        type: 'success',
      });

      setMeetups(
        meetups.map(meetup => {
          if (meetup.id === id) {
            return { ...meetup, subscribed: true };
          }
          return meetup;
        })
      );
    } catch (err) {
      if (err.response) {
        showMessage({
          message: err.response.data.error,
          type: 'danger',
        });
      } else {
        showMessage({
          message: 'Connection error.',
          type: 'danger',
        });
      }
    }
  }

  function handleDateChange(date) {
    setLoading(true);
    setSearchDate(date);
    setMeetups([]);
    setEndOfList(false);
    setPage(1);
  }

  return (
    <Background>
      <Header />
      <Container>
        <DatePicker onChange={handleDateChange} />
        {loading ? (
          <LoadingIndicator size="large" color="rgb(70, 128, 255)" />
        ) : (
          <MeetupList
            data={meetups}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={refreshing ? null : <EmptyContainer />}
            refreshing={refreshing}
            onRefresh={refresh}
            onEndReachedThreshold={0.5}
            onEndReached={loadMore}
            renderItem={({ item }) => (
              <Meetup
                data={item}
                onPress={() => {
                  handleSubscribe(item.id);
                }}
              />
            )}
          />
        )}
      </Container>
    </Background>
  );
}

Dashboard.navigationOptions = {
  tabBarLabel: 'Meetups',
  tabBarIcon: ({ tintColor }) => (
    <Icon name="list" size={20} color={tintColor} />
  ),
};
